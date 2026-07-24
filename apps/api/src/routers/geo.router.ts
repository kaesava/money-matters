import { tenantProcedure } from '../trpc/trpc.js';
import { getPlaceSuggestionsHandler, getPlaceDetailsHandler } from "@money-matters/capability-geo";
import { z } from 'zod';

export const geoRouter = {
  getPlaceSuggestions: tenantProcedure
    .input(
      z.object({
        query: z.string().min(2),
        countries: z.array(z.string()).default(['AU', 'NZ']),
      }).strict()
    )
    .query(async ({ input }) => {
      return await getPlaceSuggestionsHandler(input);
    }),

  getPlaceDetails: tenantProcedure
    .input(
      z.object({
        placeId: z.string(),
      }).strict()
    )
    .query(async ({ input }) => {
      return await getPlaceDetailsHandler(input.placeId);
    }),
};
