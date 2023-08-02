import { DependencyContainer } from "tsyringe";
import type { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import type { IAkiProfile } from "@spt-aki/models/eft/profile/IAkiProfile";
import type { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import type { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { MemberCategory } from "@spt-aki/models/enums/MemberCategory";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";

class Mod implements IPreAkiLoadMod
{
    logger: ILogger;

    public preAkiLoad(container: DependencyContainer): void 
    {
        this.logger = container.resolve<ILogger>("WinstonLogger");
        const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");
        const profileHelper = container.resolve<ProfileHelper>("ProfileHelper");
        
        // Hook up to the ggame start, so we can clean the profile JSON
        staticRouterModService.registerStaticRouter(
            "StaticRouteDialogFix",
            [
                {
                    url: "/client/game/start",
                    action: (_url, _info, sessionId, output) => 
                    {
                        if (sessionId)
                        {
                            const fullProfile = profileHelper.getFullProfile(sessionId);
                            this.checkForAndRecoverUndefinedDialogs(fullProfile);
                        }
                        
                        return output;
                    }
                }
            ],
            "aki"
        );
    }

    /**
     * Check for a dialog with the key 'undefined', and recover it by marking it as from 'Unknown'
     * @param fullProfile Profile to check for dialog in
     */
    protected checkForAndRecoverUndefinedDialogs(fullProfile: IAkiProfile): void
    {
        const undefinedDialog = fullProfile.dialogues["undefined"];
        if (undefinedDialog)
        {
            this.logger.warning("Found undefined dialog, recovering...");
            const unknownDialog = fullProfile.dialogues["Unknown"];
            if (unknownDialog)
            {
                this.logger.info(`Found Unknown contact with ${unknownDialog.messages.length} messages, merging undefined with ${undefinedDialog.messages.length} messages...`);

                // If the profile already has an "unknown" sender, prepend the messages
                unknownDialog.messages = undefinedDialog.messages.concat(unknownDialog.messages);
                unknownDialog.new = undefinedDialog.new;
            }
            else
            {
                this.logger.info(`Creating Unknown contact with ${undefinedDialog.messages.length} messages`);

                // Otherwise just set the whole Unknown dialogues object, updating some properties as required
                undefinedDialog._id = "Unknown";
                undefinedDialog.type = 1;

                // Setup the user if required
                if (!undefinedDialog.Users)
                {
                    undefinedDialog.Users = [{
                        _id: "Unknown",
                        info: {
                            Level: 0,
                            Nickname: "Unknown",
                            Side: "Usec",
                            MemberCategory: MemberCategory.SYSTEM
                        }
                    }];
                }

                fullProfile.dialogues["Unknown"] = undefinedDialog;
            }

            // Update the _id of the messages as well, otherwise we get an exception
            for (const message of fullProfile.dialogues["Unknown"].messages)
            {
                message.uid = "Unknown";
            }

            delete fullProfile.dialogues["undefined"];
        }
    }
}
module.exports = {mod: new Mod()}