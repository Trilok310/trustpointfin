const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const mockData = [
  // 1. Beginner education
  {
    format: 'CAROUSEL',
    cta_type: 'angel_one',
    slides: [
      { title: 'Stock Market 101', text: 'What is a Demat Account?', visual: 'none' },
      { title: 'Digital Locker', text: 'A Demat account holds your shares in digital form.', visual: 'none' },
      { title: 'Mandatory', text: 'You cannot invest in Indian stocks without one.', visual: 'none' }
    ]
  },
  // 2. Myth/mistake
  {
    format: 'CAROUSEL',
    cta_type: 'learn_more',
    slides: [
      { title: 'Biggest Myth', text: 'You need ₹1 Lakh to start investing.', visual: 'none' },
      { title: 'The Truth', text: 'You can start an SIP with just ₹500/month.', visual: 'none' }
    ]
  },
  // 3. Calculation
  {
    format: 'REEL',
    cta_type: 'engagement',
    slides: [
      { title: 'Rule of 72', text: 'How long to double your money?', visual: 'number' },
      { title: 'Math', text: '72 / Interest Rate = Years to Double', visual: 'number' }
    ]
  },
  // 4. Quiz/engagement
  {
    format: 'CAROUSEL',
    cta_type: 'engagement',
    slides: [
      { title: 'Quiz Time!', text: 'Which asset gave the highest return in 10 years?', visual: 'quiz' },
      { title: 'A. Gold\nB. Real Estate\nC. Nifty 50', text: 'Drop your answer below!', visual: 'none' }
    ]
  },
  // 5. Technical/fundamental
  {
    format: 'CAROUSEL',
    cta_type: 'none',
    slides: [
      { title: 'What is P/E Ratio?', text: 'Price to Earnings', visual: 'none' },
      { title: 'Why it matters', text: 'Tells you if a stock is cheap or expensive.', visual: 'none' }
    ]
  }
];

const dest = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0';
let count = 1;

for (const data of mockData) {
    fs.writeFileSync('latest_slides.json', JSON.stringify(data));
    execSync('node scripts/generate-carousel.js', {stdio: 'inherit'});
    
    fs.copyFileSync('slides/slide_1.jpg', path.join(dest, `test_post_${count}.jpg`));
    count++;
}
console.log('Mock visuals generated and copied to artifacts!');
