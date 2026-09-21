# Ani Tool Contract

All tools are narrow, typed application operations. There is no generic SQL, URL fetch, JavaScript execution or arbitrary navigation tool.

## set_harvest_context
Validates/proposes crop, quantityKg, originMunicipality, readyDate and optional variety/grade/packaging. Ambiguous extraction requires confirmation before committing shared state.

## find_outlets
Input: authoritative HarvestQuery. Calls the existing market repository and `evaluateFit`. Output includes outlet identity plus the complete factual fit projection: status, acceptedKg, remainingKg, buyer-posted, reference, and demo price fields kept separate, gross/after-transport only when calculable, evidence kind/source/freshness, unknowns and confirmation questions.

## get_outlet_details
Returns only repository-backed outlet facts and deterministic fit for the current harvest.

## compare_outlets
Maximum three validated outlet IDs. Uses the same deterministic calculations as the comparison UI. Never emits a winner.

## explain_current_fit_facts
Returns structured facts already calculated by AniWhere. It does not reclassify fit.

## get_confirmation_questions
Returns deterministic confirmation questions/unknowns from FitResult.

## set_or_update_transport_amount
Accepts an explicit farmer-entered nonnegative amount. It may recalculate amount-after-transport when price/accepted quantity exist. It never calls that result profit.

## navigate_to
Allowlist only: `/`, `/discover`, `/saved`, `/compare`, `/places/:known-slug`. Parameters pass existing serializers/validation.

## save_outlet
Validates a known outlet ID and delegates to the existing save mechanism. No external contact or transaction occurs.

## Response invariants
Every market-bearing result carries `dataMode` and preserves null. Demo facts are labelled demo. Buyer-posted, public-reference, and demo price fields are structurally separate; reference/demo values can never occupy the buyer-posted field. Unknown quantity never becomes zero. PARTIAL preserves accepted and remaining quantity. No tool reserves capacity or confirms a sale.
