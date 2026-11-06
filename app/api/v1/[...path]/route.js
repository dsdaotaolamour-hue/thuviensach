import {handle} from '../../../../server/api.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function route(request,context) { return handle(request,(await context.params).path); }
export {route as GET,route as POST,route as PATCH};
