# 🚀 NDC Transport Tracker Dashboard

Interactive dashboard for visualizing NDC transport targets and mitigation measures.

## 📊 Live Dashboard

**Dashboard URL:** `https://[your-username].github.io/ndc-tracker`

Embed in WordPress:
```html
<iframe 
  src="https://[your-username].github.io/ndc-tracker" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border: none;">
</iframe>
```

---

## 🔄 How to Update Data

### Method 1: Web Interface (EASIEST - No coding required!)

1. Go to your repository: `https://github.com/[your-username]/ndc-tracker`
2. Click on the `data/` folder
3. Click "Add file" → "Upload files"
4. Drag and drop your updated Excel file: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`
5. Scroll down and click "Commit changes"
6. ✅ **Done!** GitHub Actions will automatically:
   - Process the Excel file
   - Generate new data.json
   - Update the dashboard (takes 1-2 minutes)

### Method 2: GitHub Desktop (Visual app)

1. Install [GitHub Desktop](https://desktop.github.com/)
2. Clone this repository
3. Replace the Excel file in the `data/` folder
4. Click "Commit to main" 
5. Click "Push origin"
6. ✅ Done!

### Method 3: Command Line

```bash
# Clone repository (first time only)
git clone https://github.com/[your-username]/ndc-tracker.git
cd ndc-tracker

# Update Excel file
cp /path/to/new/excel/file.xlsx data/GIZ-SLOCAT_Transport-Tracker-database.xlsx

# Commit and push
git add data/
git commit -m "Update data"
git push

# Or run locally:
python update_data.py
```

---

## 📁 Repository Structure

```
ndc-tracker/
├── data/
│   ├── GIZ-SLOCAT_Transport-Tracker-database.xlsx  ← UPDATE THIS
│   └── processed/
│       └── data.json                               ← Auto-generated
│
├── .github/
│   └── workflows/
│       └── update-data.yml                         ← GitHub Actions config
│
├── index.html                                      ← Dashboard HTML
├── styles.css                                      ← Styles
├── script.js                                       ← JavaScript
├── update_data.py                                  ← Data processing script
└── README.md                                       ← This file
```

---

## ⚙️ How It Works

1. **You upload** a new Excel file to the `data/` folder
2. **GitHub Actions** automatically detects the change
3. **Python script** processes the Excel and generates `data.json`
4. **Dashboard** reads the JSON and updates visualizations
5. **Changes go live** on GitHub Pages automatically

---

## 🎨 Dashboard Features

### Tab 1: Progress in NDC Transport Targets
- Bar chart showing % of NDCs with transport targets across 3 generations
- Interactive map with country-level data
- Filters: Generation, Region

### Tab 2: Leading Measures for Decarbonisation
- Bar chart of top mitigation measure categories
- Heat map showing measure mentions by country
- Filters: Generation, Region

---

## 🔧 Technical Details

**Frontend:**
- Pure HTML/CSS/JavaScript (no frameworks)
- Chart.js for visualizations
- Leaflet.js for maps
- Fully responsive

**Data Processing:**
- Python 3.11+
- openpyxl library
- Runs automatically in GitHub Actions

**Hosting:**
- GitHub Pages (free)
- Auto-deploys on every update
- HTTPS included

---

## 📝 Requirements

**For updating data (web interface):**
- ✅ GitHub account (free)
- ✅ Web browser
- ✅ That's it!

**For local development:**
- Python 3.11 or higher
- pip install openpyxl

---

## 🆘 Troubleshooting

### Dashboard not updating after uploading Excel?

1. Check GitHub Actions tab in your repository
2. Look for the "Update Dashboard Data" workflow
3. If it failed, check the error logs
4. Common issues:
   - Excel file name changed (must be exact: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`)
   - Excel file corrupted
   - Wrong folder (must be in `data/` folder)

### How to check if data updated?

Visit: `https://[your-username].github.io/ndc-tracker/data/processed/data.json`

You should see the JSON data. Check the modification date.

### Dashboard shows old data?

- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Wait 2-3 minutes after uploading (GitHub Pages takes time to deploy)

---

## 📞 Support

For issues or questions:
1. Check GitHub Actions logs
2. Verify Excel file format matches original
3. Create an issue in this repository

---

## 📄 License

Data: GIZ-SLOCAT Transport Tracker Database  
Dashboard: Custom implementation for GIZ/SLOCAT

---

## 🎉 Credits

**Data Source:** GIZ-SLOCAT Partnership on Sustainable, Low Carbon Transport  
**Dashboard:** Interactive visualization platform for NDC tracking

Last updated: Auto-generated on each data update
