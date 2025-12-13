# Public Assets Directory

This folder is used to store static assets that are served directly by the web server.

## Data Files (Database)

All JSON data files exported from the Teacher Dashboard must be uploaded here.

### Option 1: Standard Mode (Recommended)
1. Export your data as `student_data.json`.
2. Upload it here.
3. It will be accessible at `https://your-site.com/student_data.json`.
4. Standard student links will automatically read this file.

### Option 2: Multi-Class Mode (Advanced)
If you want to keep different classes in separate files:
1. In Teacher Dashboard, change the filename (e.g., to `class_a.json`).
2. Download and upload `class_a.json` to this folder.
3. **Keep** `student_data.json` here as well if other students still use it.
4. You can have unlimited files co-existing here:
   - `public/student_data.json`
   - `public/class_a.json`
   - `public/class_b.json`

The Teacher Dashboard will automatically generate the correct links (e.g., `...&data=class_a.json`) for you.
