const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csvtojson");

const getDataPokemon = async () => {
  try {
    let newData = await csv().fromFile("pokemon.csv");
    const pokemonWithImages = [];

    for (const pokemon of newData) {
      const imageName = `${pokemon.Name}.png`;
      const imagePath = `public/images/${imageName}`;

      if (fs.existsSync(imagePath)) {
        pokemonWithImages.push(pokemon);
      }
    }

    let data = JSON.parse(fs.readFileSync("db.json"));
    data.pokemon = pokemonWithImages;

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
    //allow title,limit and page query string only
    const filterKeys = Object.keys(filterQuery);
    filterKeys.forEach((key) => {
      if (!allowedFilter.includes(key)) {
        const exception = new Error(`Query ${key} is not allowed`);
        exception.statusCode = 401;
        throw exception;
      }
      if (!filterQuery[key]) delete filterQuery[key];
    });

    //Number of items skip for selection
    let offset = limit * (page - 1);

    // Read data from db.json then parse JSobject
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);
    const { pokemon } = db;

    //Filter data by title
    let result = [];

    if (filterKeys.length) {
      filterKeys.forEach((condition) => {
        result = result.length
          ? result.filter(
              (pokemon) => pokemon[condition] === filterQuery[condition]
            )
          : pokemon.filter(
              (pokemon) => pokemon[condition] === filterQuery[condition]
            );
      });
    } else {
      result = pokemon;
    }
    //then select number of result by offset
    result = result.slice(offset, offset + limit);

    //send response
    res.status(200).json(pokemon);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
