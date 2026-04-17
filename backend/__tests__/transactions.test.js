const mongoose = require('mongoose');

const bookingService = require('../services/bookingService');
const ticketsService = require('../services/ticketsService');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

describe('Transaction enforcement', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('fails closed in production when ENABLE_TRANSACTIONS=true but sessions are unavailable (bookSeat)', async () => {
    process.env.ENABLE_TRANSACTIONS = 'true';
    process.env.NODE_ENV = 'production';

    jest.spyOn(mongoose, 'startSession').mockImplementation(async () => {
      throw new Error('Transactions not supported');
    });

    await expect(
      bookingService.bookSeat({
        eventId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
      })
    ).rejects.toMatchObject({ status: 500 });
  });

  it('fails closed in production when ENABLE_TRANSACTIONS=true but sessions are unavailable (bookMultiSeats)', async () => {
    process.env.ENABLE_TRANSACTIONS = 'true';
    process.env.NODE_ENV = 'production';

    jest.spyOn(mongoose, 'startSession').mockImplementation(async () => {
      throw new Error('Transactions not supported');
    });

    await expect(
      ticketsService.bookMultiSeats({
        eventId: '507f1f77bcf86cd799439011',
        event: { pricing: { type: 'paid', currency: 'USD' } },
        seatsChosen: ['S001'],
        userId: '507f1f77bcf86cd799439012',
        expectedAmount: 10,
        paymentMethod: 'credit_card',
        transactionId: 'tx_1',
        couponCode: null,
        metadata: {},
      })
    ).rejects.toMatchObject({ status: 500 });
  });

  it('aborts the transaction on insertMany failure when ENABLE_TRANSACTIONS=true (bookMultiSeats)', async () => {
    process.env.ENABLE_TRANSACTIONS = 'true';
    process.env.NODE_ENV = 'test';

    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(session);
    jest.spyOn(Event, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(Ticket, 'insertMany').mockImplementation(async () => {
      throw new Error('insert failed');
    });

    await expect(
      ticketsService.bookMultiSeats({
        eventId: '507f1f77bcf86cd799439011',
        event: { pricing: { type: 'paid', currency: 'USD' } },
        seatsChosen: ['S001', 'S002'],
        userId: '507f1f77bcf86cd799439012',
        expectedAmount: 10,
        paymentMethod: 'credit_card',
        transactionId: 'tx_1',
        couponCode: null,
        metadata: {},
      })
    ).rejects.toThrow('insert failed');

    expect(session.startTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});

