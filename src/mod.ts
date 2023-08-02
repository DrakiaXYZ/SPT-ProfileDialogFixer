import { DependencyContainer } from "tsyringe";
import type { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import type { IAkiProfile } from "@spt-aki/models/eft/profile/IAkiProfile";
import type { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import type { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";

class Mod implements IPreAkiLoadMod
{
    public preAkiLoad(container: DependencyContainer): void 
    {
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
                            this.checkForAndRemoveUndefinedDialogs(fullProfile);
                        }
                        
                        return output;
                    }
                }
            ],
            "aki"
        );
    }

    /**
     * Check for a dialog with the key 'undefined', and remove it
     * @param fullProfile Profile to check for dialog in
     */
    protected checkForAndRemoveUndefinedDialogs(fullProfile: IAkiProfile): void
    {
        const undefinedDialog = fullProfile.dialogues["undefined"];
        if (undefinedDialog)
        {
            delete fullProfile.dialogues["undefined"];
        }
    }
}
module.exports = {mod: new Mod()}