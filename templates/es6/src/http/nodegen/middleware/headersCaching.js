/**
 * Express middleware to control the http headers for caching only
 * @returns {Function}
 */
export default () => {
  return (req, res, next) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.header('Expires', 'Thu, 19 Nov 1981 08:52:00 GMT')
    next()
  }
}