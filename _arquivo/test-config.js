import { test, expect, chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:5173/configuracoes', { waitUntil: 'networkidle' });
  
  await page.fill('input[placeholder="gsk_..."]', 'gsk_test_key_123');
  await page.click('text="Salvar chave"');
  
  await page.waitForTimeout(500);
  
  const buttonText = await page.textContent('button:has-text("Salvo")');
  console.log('Button text after save:', buttonText);
  
  const savedKey = await page.evaluate(() => localStorage.getItem('groq_api_key'));
  console.log('LocalStorage groq_api_key:', savedKey);
  
  await browser.close();
})();
