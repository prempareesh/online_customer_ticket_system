const db = require('../config/db');

exports.getUsers = async (req, res, next) => {
    try {
        let query = db.collection('Users').where('role', '==', 'customer');
        if (req.user.college) {
            query = query.where('college', '==', req.user.college);
        }

        const snapshot = await query.get();
        let users = [];

        // We also need to get the ticket counts for each user
        // We can do this by fetching tickets and grouping them
        let ticketQuery = db.collection('Tickets').where('is_deleted', '==', false);
        if (req.user.college) {
            ticketQuery = ticketQuery.where('user_college', '==', req.user.college);
        }
        const ticketsSnapshot = await ticketQuery.get();
        const ticketCounts = {};
        ticketsSnapshot.forEach(doc => {
            const t = doc.data();
            ticketCounts[t.user_id] = (ticketCounts[t.user_id] || 0) + 1;
        });

        snapshot.forEach(doc => {
            const data = doc.data();
            let createdAt = data.created_at;
            if (createdAt && createdAt.toDate) createdAt = createdAt.toDate();
            users.push({
                user_id: data.user_id,
                name: data.name,
                email: data.email,
                role: data.role,
                college: data.college,
                registration_number: data.registration_number,
                created_at: createdAt,
                total_tickets: ticketCounts[data.user_id] || 0
            });
        });

        // Sort by created_at desc
        users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) { next(err); }
};

exports.getReports = async (req, res, next) => {
    try {
        let userQuery = db.collection('Users').where('role', '==', 'customer');
        let ticketQuery = db.collection('Tickets');

        if (req.user.college) {
            userQuery = userQuery.where('college', '==', req.user.college);
            ticketQuery = ticketQuery.where('user_college', '==', req.user.college);
        }

        const userSnapshot = await userQuery.get();
        const ticketSnapshot = await ticketQuery.get();

        const totalUsers = userSnapshot.size;
        let totalTickets = 0;

        let statusCounts = {};
        let dailyCountsMap = {};

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        ticketSnapshot.forEach(doc => {
            const t = doc.data();
            totalTickets++;

            // Status counts
            statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;

            // Daily tickets
            const createdDate = new Date(t.created_at);
            if (createdDate >= sevenDaysAgo) {
                const dateString = createdDate.toISOString().split('T')[0];
                dailyCountsMap[dateString] = (dailyCountsMap[dateString] || 0) + 1;
            }
        });

        const statusStats = Object.keys(statusCounts).map(k => ({ status: k, count: statusCounts[k] }));
        const dailyTickets = Object.keys(dailyCountsMap).map(k => ({ date: k, count: dailyCountsMap[k] })).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalTickets,
                statusStats,
                dailyTickets
            }
        });
    } catch (err) { next(err); }
};
