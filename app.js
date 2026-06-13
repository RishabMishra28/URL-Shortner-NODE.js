import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";

const PORT = process.env.PORT || 3002;
const DATA_FILE = path.join("data", "links.json");

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
};

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
    try {
        // Home page
        if (req.method === "GET" && req.url === "/") {
            const data = await readFile(path.join("public", "index.html"));

            res.writeHead(200, {
                "Content-Type": "text/html",
            });

            return res.end(data);
        }

        // CSS file
        if (req.method === "GET" && req.url === "/style.css") {
            const data = await readFile(path.join("public", "style.css"));

            res.writeHead(200, {
                "Content-Type": "text/css",
            });

            return res.end(data);
        }

        // GET /links
        if (req.method === "GET" && req.url === "/links") {
            const links = await loadLinks();

            res.writeHead(200, {
                "Content-Type": "application/json",
            });

            return res.end(JSON.stringify(links));
        }

        // POST /shorten
        if (req.method === "POST" && req.url === "/shorten") {
            const links = await loadLinks();

            let body = "";

            req.on("data", (chunk) => {
                body += chunk;
            });

            req.on("end", async () => {
                try {
                    const { url, shortCode } = JSON.parse(body);

                    if (!url) {
                        res.writeHead(400, {
                            "Content-Type": "text/plain",
                        });

                        return res.end("URL is required");
                    }

                    const finalShortCode =
                        shortCode || crypto.randomBytes(4).toString("hex");

                    if (links[finalShortCode]) {
                        res.writeHead(400, {
                            "Content-Type": "text/plain",
                        });

                        return res.end(
                            "Short code already exists. Please choose another."
                        );
                    }

                    links[finalShortCode] = url;

                    await saveLinks(links);

                    res.writeHead(200, {
                        "Content-Type": "application/json",
                    });

                    res.end(
                        JSON.stringify({
                            success: true,
                            shortCode: finalShortCode,
                        })
                    );
                } catch (error) {
                    console.error(error);

                    res.writeHead(500, {
                        "Content-Type": "text/plain",
                    });

                    res.end("Internal Server Error");
                }
            });

            return;
        }

        // Redirect route
        if (req.method === "GET") {
            const links = await loadLinks();
            const shortCode = req.url.slice(1);

            if (links[shortCode]) {
                res.writeHead(302, {
                    Location: links[shortCode],
                });

                return res.end();
            }

            res.writeHead(404, {
                "Content-Type": "text/plain",
            });

            return res.end("Shortened URL is not found");
        }

        // 404
        res.writeHead(404, {
            "Content-Type": "text/plain",
        });

        res.end("404 page not found");

    } catch (error) {
        console.error(error);

        res.writeHead(500, {
            "Content-Type": "text/plain",
        });

        res.end("Internal Server Error");
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});