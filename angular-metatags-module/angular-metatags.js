/**
 * Author Avraam Mavridis (avr.mav@gmail.com)
 * https://github.com/AvraamMavridis
 */
angular.module('metatags', [])
  .provider('MetaTags', function() {

    var routes = {};
    var otherwise = {};

    this.when = function(path, metatags) {
      routes[path] = metatags;
      return this;
    };

    this.otherwise = function(metatags) {
      otherwise = metatags;
      return this;
    };

    var getMetaTags = function(stateName) {
      var metatags = routes[stateName];
      if (!metatags) {
        metatags = otherwise || {};
      }
      return metatags;
    };

    this.$get = ["$rootScope", function($rootScope) {

      var update = function(evt, toState) {
        var metatags = getMetaTags(toState.name);
        $rootScope.metatags = metatags;
      };

      return {
        initialize: function() {
          $rootScope.metatags = {};
          $rootScope.$on('$stateChangeSuccess', update);
        }
      }
    }];
  })
  .directive('metaTags', ['$document', '$q', '$location', function($document, $q, $location) {
    return {
      restrict: 'A',
      link: function(scope, el) {
        var tags = {};
        var updatePromise = $q.resolve();

        var removeOldTags = function(metatags) {
          var defer = $q.defer();
          async.forEachOf(tags, function(tag, tagId, cb) {
            if (!metatags[tagId]) {
              tag.remove();
              delete tags[tagId];
            }
            cb();
          }, function() {
            defer.resolve(metatags);
          });
          return defer.promise;
        };

        var insertOrUpdateTags = function(metatags) {
          var canonicalUrl = [$location.protocol(), '://', $location.host(), $location.path()]
            .join('');
          var canonicalTag = tags['canonical'];
          if (!canonicalTag) {
            canonicalTag = angular.element('<link rel="canonical" href="">');
            el.append(canonicalTag);
            tags['canonical'] = canonicalTag;
          }
          canonicalTag.attr('href', canonicalUrl);

          var defer = $q.defer();
          async.forEachOf(metatags, function(value, tagId, cb) {
            if (tagId === 'title') {
              $document.prop('title', value);
            } else {
              var tag = tags[tagId];
              if (!tag) {
                tag = angular.element('<meta name="' + tagId + '" content="">');
                el.append(tag);
                tags[tagId] = tag;
              }
              tag.attr('content', value);
            }
            cb();
          }, defer.resolve);
          return defer.promise;
        };

        scope.$watch('metatags', function(metatags) {
          updatePromise = updatePromise
            .then(function() {
              return removeOldTags(metatags)
            })
            .then(insertOrUpdateTags);
        });
      }
    }
  }]);