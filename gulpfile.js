'use strcit';

const requireDir = require('require-dir');

// ==============================
// = Importing all Gulp's tasks = 
// ==============================

requireDir('./gulp/tasks', {recursive: true});
