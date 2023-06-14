const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csvtojson");
const convert = require("convert-units");

const getDataPokemon = async () => {
  const dbExists = fs.existsSync("db.json");
  if (dbExists) {
    console.log("Skipping reset data from pokemone-expand.csv.");
    return;
  }

  try {
    let newData = await csv().fromFile("pokemone-expand.csv");
    const pokemonWithImages = [];

    for (let i = 0; i < newData.length; i++) {
      const pokemon = newData[i];
      const imageName = `${pokemon.name.toLowerCase()}.png`;
      const imagePath = `public/images/${imageName}`;

      const heightInMeters = parseFloat(pokemon.height_m);
      const heightInFt = convert(heightInMeters).from("m").to("ft");

      const weightInKg = parseFloat(pokemon.weight_kg);
      const weightInPounds = convert(weightInKg).from("kg").to("lb");
      const formattedWeight = weightInPounds.toFixed(1);

      if (fs.existsSync(imagePath)) {
        // const imageUrl = `http://localhost:8080/images/${imageName}`;
        const imageUrl = `https://pokedex-doo.onrender.com/images/${imageName}`;
        const types = [];

        if (pokemon.type1) {
          types.push(pokemon.type1.toLowerCase());
        }

        if (pokemon.type2) {
          types.push(pokemon.type2.toLowerCase());
        }

        const newPokemon = {
          id: (i + 1).toString(),
          name: pokemon.name,
          types: types,
          url: imageUrl,
          height: heightInFt.toString(),
          weight: formattedWeight,
          category: pokemon.classfication,
          abilities: pokemon.abilities,
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
    console.log("Reset data from pokemone-expand.csv successful.");
  } catch (error) {
    console.log("Error reset data:", error);
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
    limit = parseInt(limit) || 20;
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
    // Find the index of the requested Pokemon
    const index = pokemons.findIndex((pokemon) => pokemon.id === pokemonId);
    if (index === -1) {
      // If Pokemon with the requested id doesn't exist, return 404 status
      return res.status(404).json({ message: "Pokemon not found" });
    }
    // Get the requested Pokemon
    const pokemon = pokemons[index];
    // Get the previous Pokemon
    const previousPokemon =
      pokemons[index - 1] || pokemons[pokemons.length - 1];
    // Get the next Pokemon
    const nextPokemon = pokemons[index + 1] || pokemons[0];

    // Send the response
    res.status(200).json({
      pokemon,
      previousPokemon,
      nextPokemon,
    });
  } catch (error) {
    next(error);
  }
});

function validatePokemon(fields, errorMessage) {
  if (!fields) {
    const exception = new Error(errorMessage);
    exception.statusCode = 401;
    throw exception;
  }
}

const pokemonTypes = [
  "bug",
  "dragon",
  "fairy",
  "fire",
  "ghost",
  "ground",
  "normal",
  "psychic",
  "steel",
  "dark",
  "electric",
  "fighting",
  "flyingText",
  "grass",
  "ice",
  "poison",
  "rock",
  "water",
];

/**
 * params: /
 * description: add a pokemon
 * query:
 * method: post
 */

router.post("/", (req, res, next) => {
  try {
    const { name, types, url, height, weight, category, abilities } = req.body;

    // Validate input
    validatePokemon(name, "Missing Pokemon's name");
    validatePokemon(types, "Missing Pokemon's type");
    validatePokemon(url, "Missing Pokemon's URL");
    validatePokemon(height, "Missing Pokemon's height");
    validatePokemon(weight, "Missing Pokemon's weight");
    validatePokemon(category, "Missing Pokemon's category");
    validatePokemon(abilities, "Missing Pokemon's abilities");

    // Read data from db.json then parse to JS object
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);

    let { totalPokemons, pokemons } = db;

    // Check for duplicate pokemon name
    if (
      pokemons.some(
        (pokemon) => pokemon.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      const exception = new Error(
        `Pokemon with the name '${name}' already exists.`
      );
      exception.statusCode = 401;
      throw exception;
    }

    if (
      types.some((type) => !pokemonTypes.includes(type)) ||
      types.length !== new Set(types).size ||
      types.length > 2
    ) {
      let errorMessage;
      if (types.some((type) => !pokemonTypes.includes(type))) {
        errorMessage = "Pokemon's type is invalid.";
      } else if (types.length !== new Set(types).size) {
        errorMessage = "Pokemon cannot have duplicate types.";
      } else {
        errorMessage = "Each Pokemon can have a maximum of 2 types.";
      }

      const exception = new Error(errorMessage);
      exception.statusCode = 401;
      throw exception;
    }

    // Check maxID and increment it by 1 for the new Pokemon
    let maxPokemonId = Math.max(
      ...db.pokemons.map((pokemon) => parseInt(pokemon.id))
    );

    const newPokemonId = (maxPokemonId + 1).toString();

    // Post processing
    const newPokemon = {
      id: newPokemonId,
      name,
      types,
      url,
      height,
      weight,
      category,
      abilities,
    };
    maxPokemonId += 1;

    // Add new pokemon to pokemon JS object
    pokemons.push(newPokemon);

    // Update total pokemons
    totalPokemons++;
    db.totalPokemons = totalPokemons;

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

/**
 * params: /
 * description: update a pokemon
 * query:
 * method: put
 */

router.put("/:pokemonId", (req, res, next) => {
  //put input validation
  try {
    const allowUpdate = [
      "name",
      "types",
      "url",
      "height",
      "weight",
      "category",
      "abilities",
    ];

    const { pokemonId } = req.params;

    const updates = req.body;
    const updateKeys = Object.keys(updates);
    //find update request that not allow
    const notAllow = updateKeys.filter((el) => !allowUpdate.includes(el));

    if (notAllow.length) {
      const exception = new Error(`Update field not allow`);
      exception.statusCode = 401;
      throw exception;
    }

    //put processing
    //Read data from db.json then parse to JSobject
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);
    const { pokemons } = db;

    //find pokemon by id
    const targetIndex = pokemons.findIndex(
      (pokemon) => pokemon.id === pokemonId
    );
    if (targetIndex < 0) {
      const exception = new Error(`Pokemon not found`);
      exception.statusCode = 404;
      throw exception;
    }

    const { name, types, url, height, weight, category, abilities } = updates;

    validatePokemon(name, "Missing Pokemon's name");
    validatePokemon(types, "Missing Pokemon's type");
    validatePokemon(url, "Missing Pokemon's URL");
    validatePokemon(height, "Missing Pokemon's height");
    validatePokemon(weight, "Missing Pokemon's weight");
    validatePokemon(category, "Missing Pokemon's category");
    validatePokemon(abilities, "Missing Pokemon's abilities");

    // Check duplicate pokemon's name
    if (name !== undefined) {
      if (
        pokemons.some(
          (pokemon) =>
            pokemon.name.toLowerCase() === name.toLowerCase() &&
            pokemon.id !== pokemonId
        )
      ) {
        const exception = new Error(
          `Pokemon with the name '${name}' already exists.`
        );
        exception.statusCode = 401;
        throw exception;
      }
    } else {
      // If name is not being updated, use the current name
      updates.name = pokemons[targetIndex].name;
    }

    if (
      types.some((type) => !pokemonTypes.includes(type)) ||
      types.length !== new Set(types).size ||
      types.length > 2
    ) {
      let errorMessage;
      if (types.some((type) => !pokemonTypes.includes(type))) {
        errorMessage = "Pokemon's type is invalid.";
      } else if (types.length !== new Set(types).size) {
        errorMessage = "Pokemon cannot have duplicate types.";
      } else {
        errorMessage = "Each Pokemon can have a maximum of 2 types.";
      }

      const exception = new Error(errorMessage);
      exception.statusCode = 401;
      throw exception;
    }

    //Update new content to db pokemon JS object
    const updatedPokemon = { ...db.pokemons[targetIndex], ...updates };
    db.pokemons[targetIndex] = updatedPokemon;

    //db JSobject to JSON string
    db = JSON.stringify(db);
    //write and save to db.json
    fs.writeFileSync("db.json", db);

    //put send response
    res.status(200).send(updatedPokemon);
  } catch (error) {
    next(error);
  }
});

/**
 * params: /
 * description: delete a pokemon
 * query:
 * method: delete
 */

router.delete("/:pokemonId", (req, res, next) => {
  //delete input validation
  try {
    const { pokemonId } = req.params;

    // Read data from db.json and parse it to a JavaScript object
    let db = fs.readFileSync("db.json", "utf-8");
    db = JSON.parse(db);
    const { pokemons } = db;

    // Find the index of the Pokemon to be deleted
    const targetIndex = pokemons.findIndex(
      (pokemon) => pokemon.id === pokemonId
    );

    // If the Pokemon is not found, return a 404 error
    if (targetIndex < 0) {
      const exception = new Error("Pokemon not found");
      exception.statusCode = 404;
      throw exception;
    }

    // Remove the Pokemon from the "pokemons" array
    db.pokemons.splice(targetIndex, 1);

    // Update totalPokemons count
    db.totalPokemons -= 1;

    // Convert the updated database object to a JSON string
    db = JSON.stringify(db);

    // Write and save the updated data to db.json
    fs.writeFileSync("db.json", db);

    // Send a successful response
    res.status(200).send({});
  } catch (error) {
    next(error);
  }
});

module.exports = router;
