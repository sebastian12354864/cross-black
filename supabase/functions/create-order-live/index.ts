import {createOrderHandler} from '../_shared/create-order.ts';
Deno.serve(createOrderHandler('prod'));
