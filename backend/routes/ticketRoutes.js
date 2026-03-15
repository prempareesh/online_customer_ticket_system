const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect, authorize } = require('../middlewares/authMiddleware');
// All ticket routes require authentication
router.use(protect);

// Route:  POST /api/tickets
// Desc:   Create a new ticket
router.post('/', ticketController.createTicket);

// Route:  GET /api/tickets
// Desc:   Get all tickets for the logged in user (Customer) or ALL tickets (Admin)
router.get('/', ticketController.getTickets);

// Route:  GET /api/tickets/:id
// Desc:   Get a specific ticket by ID
router.get('/:id', ticketController.getTicketById);

// Route:  PUT /api/tickets/:id/status
// Desc:   Update a ticket status (Admin only)
router.put('/:id/status', authorize('admin'), ticketController.updateTicketStatus);

// Route:  POST /api/tickets/:id/messages
// Desc:   Add a message (reply) to a ticket
router.post('/:id/messages', ticketController.addMessage);

// Route:  GET /api/tickets/:id/messages
// Desc:   Get messages for a specific ticket
router.get('/:id/messages', ticketController.getMessages);

// Route:  DELETE /api/tickets/:id
// Desc:   Delete a ticket (soft delete or set as deleted in db)
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
