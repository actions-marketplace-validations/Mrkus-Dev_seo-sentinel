const core = require('@actions/core');
const axios = require('axios');
const cheerio = require('cheerio');

async function checkPro() {
  return process.env.GITHUB_MARKETPLACE_PLAN && process.env.GITHUB_MARKETPLACE_PLAN !== 'free';
}

async function run() {
  const url = core.getInput('url');
  const maxUrls = parseInt(core.getInput('max-urls') || '50');
  const isPro = await checkPro();
  
  if (!isPro && maxUrls > 50) {
    core.setFailed(`Free limit 50 URLs. Kamu request ${maxUrls}. Upgrade Pro $29/mo untuk 10k URLs.`);
    return;
  }

  console.log(`🔍 Audit SEO untuk ${url} - Mode ${isPro ? 'PRO' : 'FREE'}`);
  
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  
  const checks = {
    title: $('title').text().length > 10 && $('title').text().length < 60,
    description: $('meta[name="description"]').attr('content')?.length > 0,
    h1: $('h1').length === 1,
    canonical: $('link[rel="canonical"]').length > 0,
    og: $('meta[property="og:title"]').length > 0
  };

  let errors = Object.entries(checks).filter(([k,v]) => !v).map(([k]) => k);
  
  await core.summary.addHeading('SEO Sentinel Report')
    .addTable([
      ['Check', 'Status'],
      ...Object.entries(checks).map(([k,v]) => [k, v ? '✅' : '❌']),
    ])
    .addRaw(`URL: ${url} | Pro: ${isPro}`)
    .write();

  if (errors.length > 0 && core.getInput('fail-on-error') === 'true') {
    core.setFailed(`SEO errors: ${errors.join(', ')}`);
  }
}
run();
