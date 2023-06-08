const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csvtojson");

const getDataPokemon = async () => {
  try {
    let newData = await csv().fromFile("pokemon.csv");
    const pokemonWithImages = [];

    for (let i = 0; i < newData.length; i++) {
      const pokemons = newData[i];
      const imageName = `${pokemons.Name}.png`;
      const imagePath = `public/images/${imageName}`;

      if (fs.existsSync(imagePath)) {
        pokemons.Id = (i + 1).toString();
        pokemonWithImages.push(pokemons);
      }
    }

    let data = JSON.parse(fs.readFileSync("db.json"));
    data.pokemons = pokemonWithImages;

    fs.writeFileSync("db.json", JSON.stringify(data));
    console.log("Data update successful.");
  } catch (error) {
    console.log("Error updating data:", error);
  }
};

// Fetch and update data when the server starts
getDataPokemon();

/**
 * params: /
 * description: get all pokemons
 * query:
 * method: get
 */
router.get("/", (req, res, next) => {
  const allowedFilter = ["Name", "Type1", "Type2"];

  try {
    let { page, limit, ...filterQuery } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    // Allow only specified filters
    const filterKeys = Object.keys(filterQuery).filter((key) =>
      allowedFilter.includes(key)
    );
    // Build the filter object
    const filters = {};
    filterKeys.forEach((key) => {
      filters[key] = filterQuery[key];
    });
    // Number of items to skip for selection
    let offset = limit * (page - 1);
    // Read data from db.json and parse JS object
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);
    const { pokemons } = db;
    // Filter data based on the specified filters
    let result = pokemons;
    filterKeys.forEach((condition) => {
      result = result.filter(
        (pokemon) => pokemon[condition] === filters[condition]
      );
    });
    // Then select the number of results by offset
    result = result.slice(offset, offset + limit);
    // Send the response
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
