// Local development backend for the chat.
//
// On localhost there is no Cloudflare, so this runs the real worker/index.js inside the page
// and answers /api/chat and /api/auth requests from it. Data is kept in this browser's
// IndexedDB, so accounts and messages survive reloads (clear site data to reset).
// Only loaded when the page is served from localhost; it is never deployed.

const DB_NAME = "a101lr-dev-chat";

const openDb = () =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore("kv");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const readAll = (db) =>
    new Promise((resolve) => {
        const tx = db.transaction("kv");
        const store = tx.objectStore("kv");
        const keys = store.getAllKeys();
        const values = store.getAll();
        tx.oncomplete = () => resolve(new Map(keys.result.map((k, i) => [k, values.result[i]])));
    });

const clone = (value) => (value instanceof ArrayBuffer ? value.slice(0) : structuredClone(value));

async function createStorage() {
    const db = await openDb();
    const data = await readAll(db);
    const write = (fn) => fn(db.transaction("kv", "readwrite").objectStore("kv"));

    return {
        async get(key) {
            if (Array.isArray(key)) {
                if (key.length > 128) throw new Error("storage.get() accepts at most 128 keys");
                return new Map(key.filter((k) => data.has(k)).map((k) => [k, clone(data.get(k))]));
            }
            return data.has(key) ? clone(data.get(key)) : undefined;
        },
        async put(key, value) {
            const entries = typeof key === "object" && value === undefined ? Object.entries(key) : [[key, value]];
            write((store) => {
                for (const [k, v] of entries) {
                    data.set(k, clone(v));
                    store.put(data.get(k), k);
                }
            });
        },
        async delete(key) {
            const keys = Array.isArray(key) ? key : [key];
            write((store) => {
                for (const k of keys) {
                    data.delete(k);
                    store.delete(k);
                }
            });
            return true;
        },
        async list({ prefix = "", limit = Infinity } = {}) {
            const keys = [...data.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit);
            return new Map(keys.map((k) => [k, clone(data.get(k))]));
        },
        async reset() {
            data.clear();
            write((store) => store.clear());
        },
    };
}

async function install() {
    const source = (await (await fetch("/worker/index.js", { cache: "no-store" })).text()).replace(
        'import { DurableObject } from "cloudflare:workers";',
        "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }",
    );
    const worker = await import(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));

    const storage = await createStorage();
    const room = new worker.ChatRoom({ storage }, {});
    const env = {
        CHAT: { idFromName: () => "main", get: () => room },
        ASSETS: { fetch: (request) => realFetch(request) },
    };

    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
        const url = new URL(typeof input === "string" ? input : input.url, location.href);

        if (url.origin === location.origin && (url.pathname.startsWith("/api/chat") || url.pathname.startsWith("/api/auth/"))) {
            const headers = new Headers(init.headers || {});
            // each sign-up looks like a new connection locally, so the per-IP limit doesn't get in the way
            headers.set("cf-connecting-ip", url.pathname === "/api/auth/register" ? `local-${Math.random()}` : "127.0.0.1");
            return worker.default.fetch(new Request(url, { ...init, headers, duplex: "half" }), env);
        }

        if (url.hostname === "www.youtube.com" && url.pathname === "/oembed") {
            try {
                return await realFetch(input, init);
            } catch {
                return new Response(JSON.stringify({ title: "YouTube video", author_name: "YouTube" }), { status: 200 });
            }
        }

        return realFetch(input, init);
    };

    // <img>/<video> tags load by URL, not through fetch, so point them at blobs from the local backend
    const fetchWhole = async (src) => {
        const first = await window.fetch(src, { headers: { range: "bytes=0-" } });
        if (first.status !== 206) return first.ok ? first.blob() : null;
        const total = Number(first.headers.get("content-range").split("/")[1]);
        const parts = [await first.blob()];
        let have = parts[0].size;
        while (have < total) {
            const res = await window.fetch(src, { headers: { range: `bytes=${have}-` } });
            if (res.status !== 206) return null;
            const part = await res.blob();
            parts.push(part);
            have += part.size;
        }
        return new Blob(parts, { type: first.headers.get("content-type") || "" });
    };
    const fix = (el) => {
        const src = el.getAttribute?.("src");
        if (!src || !src.startsWith("/api/chat/") || el.dataset.devSrc === src) return;
        el.dataset.devSrc = src;
        fetchWhole(src)
            .then((blob) => {
                if (blob) el.src = URL.createObjectURL(blob);
                else el.dispatchEvent(new Event("error"));
            })
            .catch(() => el.dispatchEvent(new Event("error")));
    };
    const scan = (node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === "IMG" || node.tagName === "VIDEO") fix(node);
        node.querySelectorAll?.("img[src], video[src]").forEach(fix);
    };
    new MutationObserver((records) => {
        for (const r of records) {
            if (r.type === "attributes") fix(r.target);
            else r.addedNodes.forEach(scan);
        }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
    scan(document.documentElement);

    window.__devBackend = { room, storage, worker };
    console.info("[chat] using the local development backend (data lives in this browser)");
}

await install();
