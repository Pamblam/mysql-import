<p align="center">
	<img src='https://i.imgur.com/AOfuTLA.png'>
</p>

# Contributing

Wanna contribute? That's awesome! I work full-time and when I'm not working I'm a full-time single dad, so your contributions are welcomed and **greatly** appreciated! You don't have to speak to me before submitting a Pull Request, but please create an issue explaining the problem (if there isn't one already) before submitting a PR.

### How to contribute

 - **Copy (Fork) the repository**
   1. Fork the repository by clicking on the [*Fork*](https://help.github.com/en/articles/fork-a-repo) button in the upper-right corner of the repo page.
   2. Clone your forked copy of the repo to your computer: `git clone <your-fork>`
   3. Open and install the package: `cd <your-fork> && npm install`
 - **Make your changes**
   1. Changes are to be made in the project's `/src` directory.
   2. If necessary, update the readme to explain any usage changes.
   3. Run `npm run build` to build the project.
 - **Test your contributions**
   1. In `/test/test.js` update the username and password variables at the top so it can connect to your local MySQL instance.
   2. Run `npm run test` to run the tests. If all the tests pass you may submit your PR.
 - **Submitting your Contribution (Pull Request)** 
   1. Revert any changes made to the `test.js` file. This is important. You'll be publishing private info and you'll break the coverage tests if you commit changes to this file .
   2. Commit your changes. Use a descriptive commit message. `git commit -m "<your commit message>"`
   3. Push your commits back to GitHub. `git push`
   4. Go back to my original repository and click on the button that says [*Create Pull Request*](https://help.github.com/en/articles/creating-a-pull-request-from-a-fork).
   5. Leave a descriptive explanation of your changes and submit the PR.

### Code Congruency

Please keep the code congruent and consistent. 

 - Use tabs instead of spaces to indent. 
 - Indent properly.
 - Curlies on the same line.

----

<center>Thank you for your contributions!</center>
