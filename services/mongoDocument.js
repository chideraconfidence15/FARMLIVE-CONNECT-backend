export function prepareMongoDocuments(documents) {
  return documents.map(({ _id, $id, __v, ...document }) => document)
}