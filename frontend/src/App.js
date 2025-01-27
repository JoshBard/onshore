const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000; // Backend port for server

// Path to the CSV file
const dataFilePath = path.join(__dirname, 'data', 'data.csv');

// Middleware to serve static files (e.g., the front-end)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Route to download the CSV file
app.get('/download', (req, res) => {
    if (fs.existsSync(dataFilePath)) {
        res.download(dataFilePath, 'data.csv', (err) => {
            if (err) {
                console.error('Error during file download:', err);
                res.status(500).send('Error downloading the file.');
            }
        });
    } else {
        res.status(404).send('File not found.');
    }
});

// Route to clear the CSV file
app.post('/clear', (req, res) => {
    if (fs.existsSync(dataFilePath)) {
        fs.writeFile(dataFilePath, '', (err) => {
            if (err) {
                console.error('Error clearing the file:', err);
                return res.status(500).send('Error clearing the file.');
            }
            res.send('File cleared successfully.');
        });
    } else {
        res.status(404).send('File not found.');
    }
});

// Start the server and listen on all interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://192.168.4.1:${PORT}`);
});
