import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()

const URI_DB = process.env.URI_DB || ""

const connectDb = async (URI: string) => {
  try {
    await mongoose.connect(URI)
    console.log("Conectado a la base de datos 'biblioteca'")
  } catch (e) {
    console.log(`Error al conectar a MongoDb :(`)
  }
}

const args = process.argv.slice(2)
const action = args[0]

// Interfaz para Libro
interface ILibro {
  titulo: string
  autor: string
  precio: number
  stock: number
}

// Creación del schema para el libro
const libroSchema = new mongoose.Schema<ILibro>({
  titulo: String,
  autor: String,
  precio: Number,
  stock: Number
}, {
  versionKey: false
})

// Modelo de libro
const Libro = mongoose.model("libro", libroSchema)

const generateError = (message: string, name: string) => {
  const error = new Error(message)
  error.name = name
  return error
}

const handleError = (error: Error) => {
  if (error.name === "CastError") {
    return "Invalid ID"
  }
  return error.message
}

const getLibros = async (id: string | undefined) => {
  try {
    if (!id) {
      return await Libro.find({}, { titulo: 1, autor: 1, precio: 1, stock: 1, _id: 1 })
    }

    const foundLibro = await Libro.findById(id)
    if (!foundLibro) throw generateError("Libro not found", "LibroNotFound")

    return foundLibro
  } catch (error) {
    const e = error as Error
    return handleError(e)
  }
}

const createLibro = async (data: string[]) => {
  try {
    const newLibro: ILibro = {
      titulo: "Sin titulo",
      autor: "Sin autor",
      precio: 0,
      stock: 0
    }

    
    if (data[0]?.split("=")[0] !== "titulo" || !data[0]?.split("=")[1]) {
      console.log("Titulo is required (ej: titulo=ElPrincipito)")
      return
    }

    for (let i = 0; i < data.length; i++) {
      const prop = data[i]?.split("=") as string[]
      const nameProp = prop[0]
      const value = prop[1]

      switch (nameProp) {
        case "titulo":
          newLibro.titulo = value as string
          break
        case "autor":
          newLibro.autor = value as string
          break
        case "precio":
          newLibro.precio = value ? Number(value) : newLibro.precio
          break
        case "stock":
          newLibro.stock = value ? Number(value) : newLibro.stock
          break
        default:
          throw generateError("Invalid data to create libro", "InvalidData")
      }
    }
    return await Libro.create(newLibro)
  } catch (error) {
    const e = error as Error
    return handleError(e)
  }
}

const updateLibro = async (id: string | undefined, updates: string[]) => {
  try {
    const data: Partial<ILibro> = {}

    for (const update of updates) {
      const [prop, value] = update.split("=")

      if (!value) {
        throw generateError(`Invalid data for ${prop}`, "InvalidData")
      }

      switch (prop) {
        case "titulo":
          data.titulo = value
          break
        case "autor":
          data.autor = value
          break
        case "precio":
          data.precio = +value
          break
        case "stock":
          data.stock = +value
          break
        default:
          throw generateError("Invalid data to update libro", "InvalidData")
      }
    }

    return await Libro.findByIdAndUpdate(id, data, { new: true })
  } catch (error) {
    const e = error as Error
    return handleError(e)
  }
}

const deleteLibro = async (id: string | undefined) => {
  try {
    if (!id) {
      await Libro.deleteMany({})
      return "Libros deleted successfully"
    }

    const deletedLibro = await Libro.findByIdAndDelete(id)

    if (!deletedLibro) throw generateError("Libro not found", "LibroNotFound")

    return deletedLibro
  } catch (error) {
    const e = error as Error
    return handleError(e)
  }
}

const main = async () => {
  await connectDb(URI_DB)

  switch (action) {
    case "info":
      console.log(`
        show → para leer todos los libros
        show id → para leer un libro puntual
        create data → para crear (ej: titulo="Game of Thrones" autor="George R.R Martin" precio=35000 stock=10)
        update id data → para actualizar
        delete id → para borrar un libro
      `)
      break
    case "show":
      console.log(await getLibros(args[1]))
      break
    case "create":
      console.log(await createLibro(args.slice(1)))
      break
    case "update":
      console.log(await updateLibro(args[1], args.slice(2)))
      break
    case "delete":
      console.log(await deleteLibro(args[1]))
      break
    default:
      console.log("Comandos válidos: <show | create | update | delete | info>")
  }

  await mongoose.disconnect()
}

main()