export const success = (res, data = {}, message = "OK", statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    ...data
  });

export const paginated = (res, key, rows, total, pagination, message = "OK") =>
  res.json({
    success: true,
    message,
    [key]: rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.max(1, Math.ceil(total / pagination.limit))
    }
  });
