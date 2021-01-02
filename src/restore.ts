import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";

async function run(): Promise<void> {
    try {
        if (utils.isGhes()) {
            utils.logWarning("Cache action is not supported on GHES");
            utils.setCacheHitOutput(false);
            return;
        }

        // Validate inputs, this can cause task failure
        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const baseKey = core.getInput(Inputs.Key, { required: true });

        const restoreKey = `${baseKey}-`;

        const now = new Date().getTime();
        const primaryKey = `${baseKey}-${now}`;

        core.saveState(State.CachePrimaryKey, primaryKey);

        const cachePaths = utils.getInputAsArray(Inputs.Path, {
            required: true
        });

        try {
            core.info(
                `Try to restore cache from [${primaryKey}, ${restoreKey}]`
            );

            const cacheKey = await cache.restoreCache(cachePaths, primaryKey, [
                restoreKey
            ]);

            if (!cacheKey) {
                core.info(`Cache not found for key: ${baseKey}`);
                return;
            }

            // Store the matched cache key
            utils.setCacheState(cacheKey);
            utils.setCacheHitOutput(true);

            core.info(`Cache restored from key: ${cacheKey}`);
        } catch (error) {
            if (error.name === cache.ValidationError.name) {
                throw error;
            } else {
                utils.logWarning(error.message);
                utils.setCacheHitOutput(false);
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();

export default run;
