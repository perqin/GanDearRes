#!/bin/bash

# Re-generate data.json with regen_data.js

./regen_data.js

# Update version.json
./update.js data

exit 0
