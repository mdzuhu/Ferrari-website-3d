const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/frames/:frameId', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'sequence', `frame_${req.params.frameId}.jpg`));
});

app.get('/api/base-image', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'ferrari_clean.png'));
});

app.get('/api/components/:componentFile', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'components', req.params.componentFile));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));