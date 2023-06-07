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
  try {
    // Read data from db.json then parse JSobject
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);
    const { pokemon } = db;

    //send response
    res.status(200).json(pokemon);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
