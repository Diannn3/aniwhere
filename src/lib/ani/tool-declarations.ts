export const ANI_TOOL_DECLARATIONS = [
  {
    name: 'set_harvest_context',
    description: 'Validate a proposed farmer harvest context before the AniWhere UI commits it.',
    parameters: {
      type: 'OBJECT',
      properties: {
        harvest: {
          type: 'OBJECT',
          properties: {
            crop: { type: 'STRING' },
            quantityKg: { type: 'NUMBER' },
            originMunicipality: { type: 'STRING' },
            readyDate: { type: 'STRING' },
            details: {
              type: 'OBJECT',
              properties: {
                variety: { type: 'STRING' },
                grade: { type: 'STRING' },
                packaging: { type: 'STRING' },
              },
            },
          },
          required: ['crop', 'quantityKg', 'originMunicipality'],
        },
      },
      required: ['harvest'],
    },
  },
  { name: 'find_outlets', description: 'Evaluate current AniWhere outlets against the authoritative harvest context.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_outlet_details', description: 'Get repository-backed facts and deterministic fit for one known outlet.', parameters: { type: 'OBJECT', properties: { outletId: { type: 'STRING' } }, required: ['outletId'] } },
  { name: 'compare_outlets', description: 'Compare one to three known outlet IDs using the same AniWhere calculations. Never declares a winner.', parameters: { type: 'OBJECT', properties: { outletIds: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['outletIds'] } },
  { name: 'explain_current_fit_facts', description: 'Return already-calculated fit facts for one known outlet without reclassifying them.', parameters: { type: 'OBJECT', properties: { outletId: { type: 'STRING' } }, required: ['outletId'] } },
  { name: 'get_confirmation_questions', description: 'Return deterministic unknowns and questions the farmer should confirm.', parameters: { type: 'OBJECT', properties: { outletId: { type: 'STRING' } }, required: ['outletId'] } },
  { name: 'set_or_update_transport_amount', description: 'Recalculate transparent after-transport proceeds using a farmer-entered transport amount. This is not profit.', parameters: { type: 'OBJECT', properties: { outletId: { type: 'STRING' }, amount: { type: 'NUMBER' } }, required: ['outletId', 'amount'] } },
  { name: 'navigate_to', description: 'Navigate to an allowlisted AniWhere route.', parameters: { type: 'OBJECT', properties: { path: { type: 'STRING' } }, required: ['path'] } },
  { name: 'save_outlet', description: 'Save a known outlet using AniWhere local saved state. This does not contact or reserve with the outlet.', parameters: { type: 'OBJECT', properties: { outletId: { type: 'STRING' } }, required: ['outletId'] } },
] as const;
