import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ProblemDetailsFilter } from './http-exception.filter';

describe('ProblemDetailsFilter', () => {
  it('formats HttpException into RFC 7807 problem+json preserving message field', () => {
    const filter = new ProblemDetailsFilter();
    const jsonMock = jest.fn();
    const typeMock = jest.fn().mockReturnValue({ json: jsonMock });
    const statusMock = jest.fn().mockReturnValue({ type: typeMock });

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ method: 'POST', originalUrl: '/api/v1/auth/login', url: '/api/v1/auth/login' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new BadRequestException(['username should not be empty']), host);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(typeMock).toHaveBeenCalledWith('application/problem+json');
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        title: 'Bad Request',
        detail: 'username should not be empty',
        message: 'username should not be empty',
        errors: ['username should not be empty'],
      }),
    );
  });

  it('masks unexpected non-HttpException errors with 500 internal error', () => {
    const filter = new ProblemDetailsFilter();
    const jsonMock = jest.fn();
    const typeMock = jest.fn().mockReturnValue({ json: jsonMock });
    const statusMock = jest.fn().mockReturnValue({ type: typeMock });

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ method: 'GET', url: '/api/v1/dashboard/overview' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('DB connection string leaked'), host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 500,
        title: 'Internal Server Error',
        detail: 'Đã xảy ra lỗi hệ thống.',
      }),
    );
  });
});
