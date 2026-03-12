const express = require('express');
const app = express();
app.all('*', (req, res) => {
    res.redirect('https://online-customer-support-ticket-system-production.up.railway.app/api/health');
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Root proxy running'));
