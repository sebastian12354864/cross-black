import {wompiEventHandler} from '../_shared/wompi-events.ts';
Deno.serve(wompiEventHandler('prod'));
