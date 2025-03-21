/**
 * Simple test server for unit tests
 */

/**
 * Starts a simple HTTP server for testing
 */
export function startServer() {
	return Bun.serve({
		port: 0, // Use an available port
		hostname: "localhost",
		fetch(req) {
			const url = new URL(req.url);

			// Serve different test cases based on the path
			switch (url.pathname) {
				case "/static":
					return new Response(
						`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Test Page</title>
                <meta name="description" content="A test page for NimCrawl">
              </head>
              <body>
                <h1>Test Page</h1>
                <p>This is a test page for NimCrawl.</p>
              </body>
            </html>
          `,
						{
							headers: { "Content-Type": "text/html" },
						},
					);

				case "/links":
					return new Response(
						`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Links Test Page</title>
              </head>
              <body>
                <h1>Links Test Page</h1>
                <ul>
                  <li><a href="/static">Static Page</a></li>
                  <li><a href="https://example.com">External Link</a></li>
                  <li><a href="/dynamic">Dynamic Page</a></li>
                </ul>
              </body>
            </html>
          `,
						{
							headers: { "Content-Type": "text/html" },
						},
					);

				case "/dynamic":
					return new Response(
						`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Dynamic Test Page</title>
                <script>
                  document.addEventListener('DOMContentLoaded', () => {
                    document.getElementById('content').innerHTML = '<p>Dynamically loaded content</p>';
                  });
                </script>
              </head>
              <body>
                <h1>Dynamic Test Page</h1>
                <div id="content">Loading...</div>
              </body>
            </html>
          `,
						{
							headers: { "Content-Type": "text/html" },
						},
					);

				default:
					return new Response("Not Found", { status: 404 });
			}
		},
	});
}
