# Public Assets Directory

This folder is used to store static assets that should be served directly by the web server.

## How to use for YuetYu Tutor:

1. In the Teacher Dashboard, click "Generate Website Data".
2. Save the `student_data.json` file.
3. Move that file INTO this folder (`public/student_data.json`).
4. Deploy your website.

Note: Vite serves files in this directory at the root path. 
Example: `public/student_data.json` -> `https://your-site.com/student_data.json`
