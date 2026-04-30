# Setup Guide - NDC Transport Tracker

## Quick Start
### Step 1: Upload Files

**Option A: Drag & Drop (Easiest)**

1. Download all files from this folder
2. Go to your new repository on GitHub
3. Click "uploading an existing file"
4. Drag ALL files and folders into the upload area
5. Click "Commit changes"

**Option B: GitHub Desktop**

1. Install GitHub Desktop (desktop.github.com)
2. Clone your repository
3. Copy all files from this folder into the cloned folder
4. In GitHub Desktop: Commit and Push

**Option C: Command Line**

```bash
cd path/to/this/folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ndc-tracker.git
git push -u origin main
```

### Step 2: Embed in WordPress

In your WordPress page/post editor:

1. Add a "Custom HTML" block
2. Paste this code:

```html
<iframe 
  src="https://YOUR-USERNAME.github.io/ndc-tracker" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border: none; border-radius: 8px;">
</iframe>
```

3. Replace `YOUR-USERNAME` with your GitHub username
4. Publish!

---

## Customization

### Add Your Logos

1. Edit `index.html`
2. Find `<div class="logo-placeholder">`
3. Replace with:

```html
<div class="logo-placeholder">
    <img src="path/to/giz-logo.png" alt="GIZ" height="40">
    <img src="path/to/slocat-logo.png" alt="SLOCAT" height="40">
</div>
```

### Change Colors

Edit `styles.css`, find `:root` section:

```css
--color-primary: #9DBE3D;  /* Your primary color */
--color-secondary: #003D5C;  /* Your secondary color */
```

---

## Updating Data

### Web Interface (Recommended)

1. Go to your repository
2. Navigate to `data/` folder
3. Click "Add file" → "Upload files"
4. Drag your updated Excel file
5. Commit changes
6. ✅ Done! Dashboard updates automatically in 1-2 minutes

### The Excel File Must Be Named:
`GIZ-SLOCAT_Transport-Tracker-database.xlsx`

(Exact name, case-sensitive)

---

## 🔧 Troubleshooting

### Dashboard not showing?

1. Check GitHub Pages is enabled (Settings → Pages)
2. Wait 2-3 minutes after enabling
3. Clear browser cache (Ctrl+Shift+R)

### Data not updating?

1. Go to "Actions" tab
2. Check if workflow failed (red X)
3. Click on failed workflow to see error
4. Common fixes:
   - Make sure Excel filename is exact: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`
   - File must be in `data/` folder
   - File must be valid Excel format

### Workflow not running?

1. Go to "Actions" tab
2. Click "Update Dashboard Data" workflow
3. Click "Enable workflow" if needed

---

**That's it! You're ready to go! 🎉**

Your dashboard will automatically update every time you upload a new Excel file.
