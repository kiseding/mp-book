/** 外部图片/文件直连源站，不走 Worker 代理（节省子请求配额） */
export function proxyUrl(url: string): string {
  return url;
}

/** HTML 中外部资源直连源站 */
export function proxyHtmlUrls(html: string): string {
  return html;
}
