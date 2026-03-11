const db = require('../config/db');
const Joi = require('joi');

const ticketSchema = Joi.object({
    title: Joi.string().required(),
    category: Joi.string().required(),
    description: Joi.string().required(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').default('Low'),
    original_filename: Joi.string().allow(null, '')
});

const statusSchema = Joi.object({
    status: Joi.string().valid('Open', 'In Progress', 'Resolved', 'Closed').required()
});

const messageSchema = Joi.object({
    message: Joi.string().required()
});

exports.createTicket = async (req, res, next) => {
    try {
        const { title, category, description, priority } = req.body;

        let original_filename = null;
        if (req.file) {
            original_filename = req.file.path;
        }

        const { error } = ticketSchema.validate({ ...req.body, original_filename });
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const [result] = await db.execute(
            'INSERT INTO Tickets (user_id, title, category, description, priority, original_filename) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.user_id, title, category, description, priority || 'Low', original_filename]
        );

        res.status(201).json({
            success: true,
            ticketId: result.insertId,
            message: 'Ticket created successfully'
        });
    } catch (err) {
        next(err);
    }
};

exports.getTickets = async (req, res, next) => {
    try {
        let query = `
            SELECT t.*, u.college 
            FROM Tickets t
            JOIN Users u ON t.user_id = u.user_id
            WHERE t.is_deleted = FALSE
        `;
        let params = [];

        // If customer, only show their tickets
        if (req.user.role === 'customer') {
            query += ' AND t.user_id = ?';
            params.push(req.user.user_id);
        } else if (req.user.role === 'admin' && req.user.college) {
            // Admin constrained to their own organization
            query += ' AND u.college = ?';
            params.push(req.user.college);
        }

        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await db.execute(query, params);

        res.status(200).json({
            success: true,
            count: tickets.length,
            data: tickets
        });
    } catch (err) {
        next(err);
    }
};

exports.getTicketById = async (req, res, next) => {
    try {
        const { id } = req.params;

        let query = `
            SELECT t.*, u.college 
            FROM Tickets t
            JOIN Users u ON t.user_id = u.user_id
            WHERE t.ticket_id = ? AND t.is_deleted = FALSE
        `;
        let params = [id];

        // Customers can only see their own tickets
        if (req.user.role === 'customer') {
            query += ' AND t.user_id = ?';
            params.push(req.user.user_id);
        } else if (req.user.role === 'admin' && req.user.college) {
            query += ' AND u.college = ?';
            params.push(req.user.college);
        }

        const [tickets] = await db.execute(query, params);

        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        res.status(200).json({
            success: true,
            data: tickets[0]
        });
    } catch (err) {
        next(err);
    }
};

exports.updateTicketStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = statusSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        // Validate access before updating
        let checkQuery = 'SELECT t.*, u.college FROM Tickets t JOIN Users u ON t.user_id = u.user_id WHERE t.ticket_id = ? AND t.is_deleted = FALSE';
        let checkParams = [id];

        if (req.user.role === 'admin' && req.user.college) {
            checkQuery += ' AND u.college = ?';
            checkParams.push(req.user.college);
        }

        const [tickets] = await db.execute(checkQuery, checkParams);
        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        // Update
        const [result] = await db.execute(
            'UPDATE Tickets SET status = ? WHERE ticket_id = ? AND is_deleted = FALSE',
            [req.body.status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Failed to update.' });
        }

        res.status(200).json({
            success: true,
            message: 'Ticket status updated'
        });
    } catch (err) {
        next(err);
    }
};

exports.addMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = messageSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        // Check if ticket exists and user has access
        let query = `
            SELECT t.*, u.college 
            FROM Tickets t
            JOIN Users u ON t.user_id = u.user_id 
            WHERE t.ticket_id = ? AND t.is_deleted = FALSE
        `;
        let params = [id];

        if (req.user.role === 'customer') {
            query += ' AND t.user_id = ?';
            params.push(req.user.user_id);
        } else if (req.user.role === 'admin' && req.user.college) {
            query += ' AND u.college = ?';
            params.push(req.user.college);
        }

        const [tickets] = await db.execute(query, params);

        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        // Insert message
        await db.execute(
            'INSERT INTO TicketMessages (ticket_id, sender_id, message) VALUES (?, ?, ?)',
            [id, req.user.user_id, req.body.message]
        );

        res.status(201).json({
            success: true,
            message: 'Message added successfully'
        });
    } catch (err) {
        next(err);
    }
};

exports.getMessages = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify ticket access
        let ticketQuery = `
            SELECT t.*, u.college 
            FROM Tickets t
            JOIN Users u ON t.user_id = u.user_id 
            WHERE t.ticket_id = ? AND t.is_deleted = FALSE
        `;
        let ticketParams = [id];

        if (req.user.role === 'customer') {
            ticketQuery += ' AND t.user_id = ?';
            ticketParams.push(req.user.user_id);
        } else if (req.user.role === 'admin' && req.user.college) {
            ticketQuery += ' AND u.college = ?';
            ticketParams.push(req.user.college);
        }

        const [tickets] = await db.execute(ticketQuery, ticketParams);

        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        // Get messages with sender info
        const [messages] = await db.execute(`
            SELECT m.*, u.name as sender_name, u.role as sender_role 
            FROM TicketMessages m
            JOIN Users u ON m.sender_id = u.user_id
            WHERE m.ticket_id = ?
            ORDER BY m.timestamp ASC
        `, [id]);

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteTicket = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify ticket access
        let checkQuery = 'SELECT t.*, u.college FROM Tickets t JOIN Users u ON t.user_id = u.user_id WHERE t.ticket_id = ? AND t.is_deleted = FALSE';
        let checkParams = [id];

        if (req.user.role === 'customer') {
            checkQuery += ' AND t.user_id = ?';
            checkParams.push(req.user.user_id);
        } else if (req.user.role === 'admin' && req.user.college) {
            checkQuery += ' AND u.college = ?';
            checkParams.push(req.user.college);
        }

        const [tickets] = await db.execute(checkQuery, checkParams);
        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        const [result] = await db.execute('UPDATE Tickets SET is_deleted = TRUE WHERE ticket_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Failed to delete.' });
        }

        res.status(200).json({
            success: true,
            message: 'Ticket deleted successfully (soft delete)'
        });
    } catch (err) {
        next(err);
    }
};
