const db = require('../config/db');

exports.getUsers = async (req, res, next) => {
    try {
        let query = `
            SELECT u.user_id, u.name, u.email, u.role, u.college, u.registration_number, u.created_at,
            COUNT(t.ticket_id) as total_tickets
            FROM Users u
            LEFT JOIN Tickets t ON u.user_id = t.user_id
            WHERE u.role = 'customer'
        `;
        const params = [];

        if (req.user.college) {
            query += ' AND u.college = ?';
            params.push(req.user.college);
        }

        query += ' GROUP BY u.user_id ORDER BY u.created_at DESC';

        const [users] = await db.execute(query, params);

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        next(err);
    }
};

exports.getReports = async (req, res, next) => {
    try {
        let userFilter = "SELECT COUNT(*) as count FROM Users WHERE role = 'customer'";
        let ticketFilter = "SELECT COUNT(t.ticket_id) as count FROM Tickets t JOIN Users u ON t.user_id = u.user_id";
        let statusFilter = "SELECT t.status, COUNT(t.ticket_id) as count FROM Tickets t JOIN Users u ON t.user_id = u.user_id";
        let dailyFilter = `
            SELECT DATE(t.created_at) as date, COUNT(t.ticket_id) as count 
            FROM Tickets t JOIN Users u ON t.user_id = u.user_id
        `;
        const params = [];

        if (req.user.college) {
            userFilter += " AND college = ?";
            ticketFilter += " WHERE u.college = ?";
            statusFilter += " WHERE u.college = ?";
            dailyFilter += " WHERE u.college = ?";
            params.push(req.user.college);
        }

        statusFilter += " GROUP BY t.status";
        dailyFilter += " GROUP BY DATE(t.created_at) ORDER BY date DESC LIMIT 7";

        // Simple report stats for the system
        const [totalUsers] = await db.execute(userFilter, req.user.college ? params : []);
        const [totalTickets] = await db.execute(ticketFilter, req.user.college ? params : []);
        const [statusStats] = await db.execute(statusFilter, req.user.college ? params : []);

        // Tickets per day in the last 7 days (simplified)
        const [dailyTickets] = await db.execute(dailyFilter, req.user.college ? params : []);

        res.status(200).json({
            success: true,
            data: {
                totalUsers: totalUsers[0] ? totalUsers[0].count : 0,
                totalTickets: totalTickets[0] ? totalTickets[0].count : 0,
                statusStats: statusStats,
                dailyTickets: dailyTickets
            }
        });
    } catch (err) {
        next(err);
    }
};
