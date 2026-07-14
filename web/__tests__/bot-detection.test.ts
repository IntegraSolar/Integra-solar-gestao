import { describe, it, expect } from 'vitest'
import { classifyUserAgent } from '@/lib/security/rate-policies'

describe('classifyUserAgent', () => {
  it('trata ferramentas de scraping/scan como "tool"', () => {
    expect(classifyUserAgent('curl/8.4.0')).toBe('tool')
    expect(classifyUserAgent('python-requests/2.31.0')).toBe('tool')
    expect(classifyUserAgent('Scrapy/2.11 (+https://scrapy.org)')).toBe('tool')
    expect(classifyUserAgent('Go-http-client/2.0')).toBe('tool')
    expect(classifyUserAgent('sqlmap/1.7')).toBe('tool')
  })

  it('UA ausente/vazio é "suspect" (não bloqueia, só sinaliza)', () => {
    expect(classifyUserAgent(null)).toBe('suspect')
    expect(classifyUserAgent('')).toBe('suspect')
    expect(classifyUserAgent('   ')).toBe('suspect')
  })

  it('navegadores reais são "human"', () => {
    expect(classifyUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36')).toBe('human')
    expect(classifyUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe('human')
  })
})
