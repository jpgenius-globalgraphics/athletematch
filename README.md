# AthleteMatch - College Recruitment Matching Platform

A beautiful, AI-powered web application that helps athletes find the perfect college match based on their academic profile, athletic level, and recruiting status.

## Features

✨ **Smart Matching Algorithm** - Matches athletes with colleges based on:
- GPA and standardized test scores (SAT/ACT)
- Athletic level and playing time
- Club team competitiveness
- Division and conference fit

📚 **Comprehensive School Database** - 20+ colleges across:
- D1 Power Five conferences
- Top liberal arts schools (D3 NESCAC)
- Mid-tier programs

🎨 **Modern, Sleek UI** - Professional dark theme with:
- Gradient accents and glass morphism
- Responsive design (mobile, tablet, desktop)
- Smooth animations and transitions
- Expandable result cards with detailed info

🚀 **Fast & Free** - Zero cost, no sign-ups, instant results

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: JSON (hardcoded, easily migrable to Supabase)
- **Hosting**: Cloudflare Pages
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account (free tier works)
- GitHub account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/jpgenius-globalgraphics/athlete-match.git
cd athlete-match
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:3000
```

## Deployment to Cloudflare Pages

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Cloudflare Pages**
- Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
- Navigate to Pages
- Connect your GitHub repo
- Set build command: `npm run build`
- Set output directory: `.next`

3. **Deploy**
Cloudflare will automatically deploy on every push to main

## Project Structure

```
athlete-match/
├── app/
│   ├── page.tsx              # Landing page
│   ├── match/
│   │   └── page.tsx          # Matching form & results
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── ResultCard.tsx        # School result card
├── lib/
│   └── matchingEngine.ts     # Matching algorithm
├── data/
│   └── schools.json          # School database
├── tailwind.config.ts        # Tailwind config
├── tsconfig.json             # TypeScript config
└── package.json
```

## How the Matching Algorithm Works

The algorithm scores schools on three main factors:

1. **Academic Fit (40%)**
   - Compares athlete's GPA to school's average GPA
   - Compares SAT/ACT scores to school averages

2. **Athletic Fit (50%)**
   - Playing time impact (90 min starter = 100 points)
   - Club level competitiveness (national = 100 points)
   - School athletic tier (elite/high/medium/low)

3. **Division Fit (10%)**
   - Matches athlete level to school division/conference
   - Considers competitive tier

Final score is normalized 0-100, with minimum 50 to show as a match.

## Customization

### Add More Schools

Edit `data/schools.json`:
```json
{
  "id": 21,
  "name": "School Name",
  "location": "City, State",
  "avgGPA": 3.8,
  "avgSAT": 1400,
  "avgACT": 31,
  "division": "D1",
  "conference": "Conference",
  "athleticLevel": "high",
  "programs": ["Sport1", "Sport2"],
  "acceptanceRate": 20,
  "tuition": "amount",
  "notes": "Recruiting focus..."
}
```

### Customize Matching Logic

Edit `lib/matchingEngine.ts`:
- Adjust weight percentages (currently 40/50/10)
- Modify athletic level scoring
- Add new factors

## Future Improvements

- [ ] User authentication and saved profiles
- [ ] Supabase integration for school database
- [ ] Coach contact information
- [ ] Athletic directory integration
- [ ] Video highlights upload
- [ ] Email match notifications
- [ ] College search filters
- [ ] Comparison tool between schools

## License

MIT License - feel free to fork and modify

## Support

Have questions? Open an issue on GitHub.

---

Built with ❤️ for student-athletes everywhere