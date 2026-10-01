# AdSense review and serving

The site retains publisher verification through the `google-adsense-account`
head metadata and `/ads.txt`. Verification does not require serving ads on login,
empty, maintenance, or tool screens.

## During review

- Keep `NEXT_PUBLIC_ADSENSE_CLIENT_ID` set to the real publisher ID.
- Keep `NEXT_PUBLIC_ADSENSE_SERVING_ENABLED` unset or `false`; redeploy after changing public environment variables.
- Keep Auto Ads **off** in AdSense → Ads → edit this site → Ad settings.
- Keep `/learn/{en,ko,ja,zh}` and its articles accessible without signing in.
- Do not enable global maintenance mode while requesting a review: crawlers and reviewers need access to the real content.
- In AdSense → Sites → this site, verify ownership using ads.txt or the account meta tag, then request review after checking the deployed changes.

The three guides contain practical input briefs, a clearly fictional storyboard,
and guidance on making original plans from references. They are not evidence of
real campaign results. Improve these pages with genuinely useful examples and
reader feedback over time; neither a fixed article count nor these changes
guarantees approval.

## After approval

Only after AdSense reports the site **Ready**, configure a valid
`NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT`, set `NEXT_PUBLIC_ADSENSE_SERVING_ENABLED=true`,
and redeploy. Leave Auto Ads off to retain the manually controlled placement.
Manual ads and the loader are permitted only on the published article routes.
The homepage, guide index, about, legal, login, generator, pricing, history,
settings, and admin screens do not render ad slots or load the ad script.

Ordinary display ads do not grant viewing credits. Any rewarded product must
use a supported rewarded format with a separate completion-verification flow.

## References

- [Google Publisher Policies](https://support.google.com/adsense/answer/10502938)
- [Site ownership verification methods](https://support.google.com/adsense/answer/12169212)
- [Auto Ads settings](https://support.google.com/adsense/answer/9305577)
- [AdSense site review](https://support.google.com/adsense/answer/12176698)
