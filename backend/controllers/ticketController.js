const { db } = require('../firebase');
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

exports.createTicket = async (req, res) => {
  try {

    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const userId =
      req.user?.user_id ||
      req.user?.uid ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user"
      });
    }

    const ticketRef = db.collection("Tickets").doc();

    const ticketData = {
      ticket_id: ticketRef.id,
      user_id: userId,
      title: title,
      description: description,
      category: category,
      priority: priority || "Low",
      status: "Open",
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: null
    };

    await ticketRef.set(ticketData);

    return res.status(201).json({
      success: true,
      data: ticketData
    });

  } catch (error) {

    console.error("Create Ticket Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });

  }
};

exports.getTickets = async (req, res, next) => {
    try {
        let query = db.collection('Tickets').where('is_deleted', '==', false);

        if (req.user.role === 'customer') {
            query = query.where('user_id', '==', req.user.user_id);
        }
        // Admin sees all tickets

        const snapshot = await query.get();
        let tickets = [];
        snapshot.forEach(doc => tickets.push(doc.data()));

        // Sort descending by created_at (most recent first)
        tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Format to what frontend expects
        const data = tickets.map(t => ({ ...t, college: t.user_college }));
        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) { next(err); }
};

exports.getTicketById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ticketRef = db.collection('Tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists || doc.data().is_deleted) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        const ticket = doc.data();

        if (
          req.user.role === "customer" &&
          ticket.user_id !== req.user.user_id
        ) {
          return res.status(403).json({
            success:false,
            message:"Access denied"
          });
        }
        // Admin can access all tickets

        res.status(200).json({ success: true, data: { ...ticket, college: ticket.user_college } });
    } catch (err) { next(err); }
};

exports.updateTicketStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = statusSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message });

        const ticketRef = db.collection('Tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists || doc.data().is_deleted) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        const ticket = doc.data();
        // Admin can update all tickets

        await ticketRef.update({ status: req.body.status, updated_at: new Date().toISOString() });
        res.status(200).json({ success: true, message: 'Ticket status updated' });
    } catch (err) { next(err); }
};

exports.addMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = messageSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message });

        const ticketRef = db.collection('Tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists || doc.data().is_deleted) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        const ticket = doc.data();
        if (req.user.role === 'customer' && ticket.user_id !== req.user.user_id) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }
        // Admin can access all tickets

        const newMessageRef = db.collection('TicketMessages').doc();
        await newMessageRef.set({
            message_id: newMessageRef.id,
            ticket_id: id,
            sender_id: req.user.user_id,
            sender_name: req.user.name,
            sender_role: req.user.role,
            message: req.body.message,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: 'Message added successfully' });
    } catch (err) { next(err); }
};

exports.getMessages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ticketRef = db.collection('Tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists || doc.data().is_deleted) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        const ticket = doc.data();
        if (req.user.role === 'customer' && ticket.user_id !== req.user.user_id) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }
        // Admin can access all tickets

        const snapshot = await db.collection('TicketMessages').where('ticket_id', '==', id).get();
        let messages = [];
        snapshot.forEach(msgDoc => messages.push(msgDoc.data()));

        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (err) { next(err); }
};

exports.deleteTicket = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ticketRef = db.collection('Tickets').doc(id);
        const doc = await ticketRef.get();

        if (!doc.exists || doc.data().is_deleted) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }

        const ticket = doc.data();
        if (req.user.role === 'customer' && ticket.user_id !== req.user.user_id) {
            return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        }
        // Admin can access all tickets

        await ticketRef.update({ is_deleted: true, updated_at: new Date().toISOString() });
        res.status(200).json({ success: true, message: 'Ticket deleted successfully (soft delete)' });
    } catch (err) { next(err); }
};
