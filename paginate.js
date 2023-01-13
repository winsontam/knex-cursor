// https://github.com/graphql/graphql-relay-js/issues/94#issuecomment-232410564
// https://stackoverflow.com/questions/38017054/mysql-cursor-based-pagination-with-multiple-columns


import {partition, every} from 'lodash';
import * as cursor from './cursor';
import {buildWhere, buildOrderBy} from './query';


export default function extendPaginate(Knex) {
  Knex.QueryBuilder.extend('paginate', function ({after, before, first, last} = {}) {
    // extract order statements
    const [orderStatements, nonOrderStatements] = partition(this._statements, {grouping: 'order'});
    this._statements = nonOrderStatements;

    if (!orderStatements.length) {
      throw new Error('orderBy is required');
    }

    if (!every(orderStatements, {type: 'orderByBasic'})) {
      throw new Error('orderBy* is not supported');
    }

    const limit = first || last;
    const isLast = !first && !!last;

    const orders = orderStatements
      .map(({value, direction}) => [value, direction && direction.toLowerCase() === 'desc']);

    // rebuild order statements
    this.orderBy(buildOrderBy(orders, isLast));

    // extract where statements
    const [whereStatements, nonWhereStatements] = partition(this._statements, {grouping: 'where'});
    this._statements = nonWhereStatements;

    // rebuild where statements
    this.where((builder) => {
      builder._statements = whereStatements;
    });

    if (after) {
      const offsets = cursor.decode(after);

      if (offsets && orders.length === offsets.length) {
        this.where(buildWhere(orders, offsets));
      }
    }

    if (before) {
      const offsets = cursor.decode(before);

      if (offsets && orders.length === offsets.length) {
        this.where(buildWhere(orders, offsets, true));
      }
    }

    if (limit) {
      this.limit(limit + 1);
    }

    return this.then(function (nodes) {
      const hasMorePage = nodes.length > limit;

      if (hasMorePage) {
        nodes.pop();
      }

      if (isLast) {
        nodes.reverse();
      }

      const pageInfo = {
        hasPrevPage: isLast && hasMorePage,
        hasNextPage: !isLast && hasMorePage,
      };

      const edges = nodes.map((node) => ({
        cursor: cursor.encode(orders.map(([column]) => node[column])),
        node,
      }));

      if (edges.length) {
        pageInfo.startCursor = edges[0].cursor;
        pageInfo.endCursor = edges[edges.length - 1].cursor;
      }

      return {pageInfo, edges};
    });
  });
}
