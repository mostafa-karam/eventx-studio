jest.mock('../utils/paymentTokens', () => ({
    signPaymentToken: jest.fn(() => 'signed-payment-token'),
}));

const { processPayment, testToken } = require('../controllers/paymentsController');
const { signPaymentToken } = require('../utils/paymentTokens');

const createMockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

describe('paymentsController simulation gating', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        jest.clearAllMocks();
    });

    it('blocks processPayment in production', async () => {
        process.env.NODE_ENV = 'production';

        const req = {
            body: { amount: 100, quantity: 1, currency: 'USD' },
            user: { _id: 'user-1' },
        };
        const res = createMockRes();

        await processPayment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Not available in production',
        });
        expect(signPaymentToken).not.toHaveBeenCalled();
    });

    it('blocks testToken in production', async () => {
        process.env.NODE_ENV = 'production';

        const req = { body: { eventId: 'event-1' }, user: { _id: 'user-1' } };
        const res = createMockRes();

        await testToken(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Not available in production',
        });
        expect(signPaymentToken).not.toHaveBeenCalled();
    });

    it('allows processPayment in non-production environments', async () => {
        process.env.NODE_ENV = 'test';

        const req = {
            body: { amount: 150, quantity: 3, currency: 'USD', eventId: 'event-2' },
            user: { _id: 'user-2' },
        };
        const res = createMockRes();

        await processPayment(req, res);

        expect(signPaymentToken).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    token: 'signed-payment-token',
                }),
            })
        );
    });
});
