function xor(a, b) {
  return (a || b) && !(a && b);
}


export function buildWhere(orders, offsets, inverse = false) {
  const [order, ...otherOrders] = orders;
  const [offset, ...otherOffsets] = offsets;
  const [column, desc] = order;
  const operator = xor(desc, inverse) ? '<' : '>';

  if (!otherOrders.length) {
    return (builder) => {
      builder
        .where(column, operator, offset);
    };
  }

  return (builder) => {
    builder
      .where(column, `${operator}=`, offset)
      .andWhere((builder) => {
        builder
          .where(column, operator, offset)
          .orWhere(buildWhere(otherOrders, otherOffsets, inverse));
      });
  };
}


export function buildOrderBy(orders, inverse = false) {
  return orders.map(([column, desc]) => ({column, order: xor(desc, inverse) ? 'DESC' : 'ASC'}));
}
