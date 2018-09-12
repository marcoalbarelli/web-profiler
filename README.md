# Web Profiler

This project has three main goals:
* profiling the speed of single pages along a prefixed flow, with very detailed timings that will allow to spot infrastructure problems.
Pretty much tries to answer to users saying "It's slow"
* regression testing (with very simple checks for now)
* pre-flight checklist. Another take on regression testing

For now everything relies on a very primitive `scenario` file for which you find an example in the `scenarios` folder. The format is almost self explanatory. Some documentation will follow.

All the steps are performed serially. This is by design. The client is configured to keep a cookie-jar in order to act as an authenticated user against a regular session.
Some very peculiar choiches (especially regarding form POSTing) account for the intricacies of ez-publish legacy.
More on this in a later version

```
docker build -t web-profiler
docker run -v ./scenarios/:/scenarios -e "scenario=/scenarios/scenario_1.json" --rm marco/web-profiler | pino-pretty 
```
