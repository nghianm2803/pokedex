const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csvtojson");

const getDataPokemon = async () => {
  try {
    let newData = await csv().fromFile("pokemon.csv");
    const pokemonWithImages = [];

    for (let i = 0; i < newData.length; i++) {
      const pokemon = newData[i];
      const imageName = `${pokemon.Name}.png`;
      const imagePath = `public/images/${imageName}`;

      if (fs.existsSync(imagePath)) {
        const imageUrl = `public/images/${imageName}`;
        const types = [];

        if (pokemon.Type1) {
          types.push(pokemon.Type1.toLowerCase());
        }

        if (pokemon.Type2) {
          types.push(pokemon.Type2.toLowerCase());
        }

        const newPokemon = {
          id: (i + 1).toString(),
          name: pokemon.Name,
          types: types,
          url: imageUrl,
        };

        pokemonWithImages.push(newPokemon);
      }
    }

    const totalPokemons = pokemonWithImages.length;

    let data = {
      totalPokemons: totalPokemons,
      pokemons: pokemonWithImages,
    };

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
  const allowedFilter = ["name", "types"];

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
      result = result.filter((pokemon) => {
        if (condition === "types") {
          const filterValue = filters[condition].toLowerCase();
          return pokemon.types.includes(filterValue);
        } else {
          const pokemonValue = pokemon[condition].toLowerCase();
          const filterValue = filters[condition].toLowerCase();
          return pokemonValue.includes(filterValue);
        }
      });
    });

    // Then select the number of results by offset
    result = result.slice(offset, offset + limit);
    // Send the response
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * params: /
 * description: get detail pokemon
 * query:
 * method: get
 */
router.get("/:pokemonId", (req, res, next) => {
  try {
    const { pokemonId } = req.params;
    // Read data from db.json and parse JS object
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);
    const { pokemons } = db;
    // Find the index of the requested Pokémon
    const index = pokemons.findIndex((pokemon) => pokemon.id === pokemonId);
    if (index === -1) {
      // If Pokémon with the requested id doesn't exist, return 404 status
      return res.status(404).json({ message: "Pokémon not found" });
    }
    // Get the requested Pokémon
    const requestedPokemon = pokemons[index];
    // Get the previous Pokémon
    const previousPokemon =
      pokemons[index - 1] || pokemons[pokemons.length - 1];
    // Get the next Pokémon
    const nextPokemon = pokemons[index + 1] || pokemons[0];

    // Send the response
    res.status(200).json({
      requestedPokemon,
      previousPokemon,
      nextPokemon,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * params: /
 * description: add a pokemon
 * query:
 * method: post
 */

router.post("/", (req, res, next) => {
  try {
    const { name, types, url } = req.body;

    if (!name || !types || !url) {
      const exception = new Error(`Missing body info`);
      exception.statusCode = 401;
      throw exception;
    }

    // Read data from db.json then parse to JS object
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);
    let { pokemons } = db;

    // Get the last Pokémon's ID and increment it by 1 for the new Pokémon
    const newPokemonId = (pokemons.length + 1).toString();

    // Post processing
    const newPokemon = {
      name,
      types,
      url,
      id: newPokemonId,
    };

    // Add new pokemon to pokemon JS object
    pokemons.push(newPokemon);
    // Update pokemons array in db JS object
    db.pokemons = pokemons;
    // Convert db JS object to JSON string
    db = JSON.stringify(db);
    // Write and save to db.json
    fs.writeFileSync("db.json", db);

    // Send response
    res.status(200).send(newPokemon);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
