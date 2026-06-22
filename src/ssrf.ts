export function isPrivateIP(ip: string): boolean {
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    );
  }
  if (ip.includes(':')) {
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
    if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;
    const lowerIp = ip.toLowerCase();
    if (lowerIp.startsWith('::ffff:')) return isPrivateIP(lowerIp.substring(7));
    if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;
    if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) return true;
  }
  return false;
}

export async function validateProxyUrlServerSide(urlStr: string): Promise<boolean> {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;

    let { hostname } = parsed;
    if (hostname.startsWith('[') && hostname.endsWith(']')) hostname = hostname.substring(1, hostname.length - 1);

    // Worker 环境通常没有 dns.lookup，先做字符串级校验
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;
    if (isPrivateIP(hostname)) return false;
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(hostname)) return false;

    return true;
  } catch {
    return false;
  }
}
