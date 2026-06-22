/** 如果 URL 是外部地址，通过 Worker 代理加载（所有网络请求走 Worker 网络） */
export function proxyUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** 将 HTML 字符串中所有外部资源 URL 替换为 Worker 代理地址 */
export function proxyHtmlUrls(html: string): string {
  if (!html) return html;
  // 代理 <img src="...">
  html = html.replace(/<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi, (match, before, quote, rawSrc, after) => {
    const src = rawSrc.split(',{')[0];
    if (!src || src.startsWith('/api/') || src.startsWith('data:')) return match;
    if (!src.startsWith('http://') && !src.startsWith('https://')) return match;
    return `<img${before}src=${quote}${proxyUrl(src)}${quote}${after}>`;
  });
  // 代理 <source src="...">
  html = html.replace(/<source\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi, (match, before, quote, rawSrc, after) => {
    if (!rawSrc || rawSrc.startsWith('/api/') || rawSrc.startsWith('data:')) return match;
    if (!rawSrc.startsWith('http://') && !rawSrc.startsWith('https://')) return match;
    return `<source${before}src=${quote}${proxyUrl(rawSrc)}${quote}${after}>`;
  });
  // 代理 poster/href 等属性
  html = html.replace(/\b(poster)=(['"])((?:https?:)?\/\/.*?)\2/gi, (match, attr, quote, url) => {
    if (url.startsWith('/api/')) return match;
    return `${attr}=${quote}${proxyUrl(url)}${quote}`;
  });
  return html;
}
