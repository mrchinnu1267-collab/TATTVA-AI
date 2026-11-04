<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>TATTVA AI - XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #e2e8f0;
            background-color: #0b0f17;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 8px 0;
          }
          p.desc {
            font-size: 14px;
            color: #94a3b8;
            margin: 0 0 24px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          }
          th {
            background-color: #1e293b;
            color: #cbd5e1;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-align: left;
            padding: 14px 16px;
            border-bottom: 1px solid #334155;
          }
          td {
            padding: 14px 16px;
            font-size: 13px;
            border-bottom: 1px solid #1e293b;
            color: #94a3b8;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:hover td {
            background-color: #1e293b;
          }
          a {
            color: #38bdf8;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>TATTVA AI – XML Sitemap</h1>
          <p class="desc">Official XML sitemap for search engines. Contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> canonical public URLs.</p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th style="width: 120px;">Priority</th>
                <th style="width: 140px;">Change Freq</th>
                <th style="width: 180px;">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <xsl:variable name="itemURL">
                      <xsl:value-of select="sitemap:loc"/>
                    </xsl:variable>
                    <a href="{$itemURL}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <span class="badge"><xsl:value-of select="sitemap:priority"/></span>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td>
                    <xsl:value-of select="substring(sitemap:lastmod, 0, 11)"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

